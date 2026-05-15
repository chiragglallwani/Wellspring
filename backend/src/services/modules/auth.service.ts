import argon2 from "argon2";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Tenant from "../../database/models/system/Tenant";
import UserModel from "../../database/models/tenant/UserModel";
import emailDeliveryService from "../../notification/emailDelivery.service";
import { buildPasswordResetOtpEmail } from "../../notification/templates/passwordResetOtp";
import { HttpError } from "../../utils/http";
import {
  generateAlphaNumericToken,
  generateRefreshToken,
  getRefreshTokenSecret,
  signJwt,
  signRefreshJwt,
} from "../../utils/token";
import { ApiResponseStatus } from "../../constants/apiResponse";
import { setAsyncStorage } from "../../utils/asyncstorage";
import logger from "../../config/logger";
import eventService from "../../events/event.service";
import { EventTypes } from "../../events/types/EventTypes";

type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RefreshPayload = {
  refreshToken: string;
};

const PASSWORD_RESET_OTP_EXPIRES_MINUTES = 15;

type ResetRequestPayload = {
  email: string;
};

type ResetVerifyPayload = {
  email: string;
  code: string;
};

type ResetConfirmPayload = {
  email: string;
  code: string;
  password: string;
};

type RefreshTokenPayload = {
  userId: string;
  tenantId: string;
  userEmail: string;
  usersFullName: string;
};

class AuthService {
  private generateResetOtp(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  }

  private isResetCodeValid(user: UserModel, code: string): boolean {
    if (!user.resetCode || !user.resetCodeExpiresAt) {
      return false;
    }

    if (user.resetCodeExpiresAt.getTime() < Date.now()) {
      return false;
    }

    return user.resetCode === code;
  }

  private async tryResolveUserForPasswordReset(email: string) {
    const tenant = await Tenant.findOne({ where: { email } });
    if (!tenant) {
      return null;
    }

    setAsyncStorage({ tenantId: tenant.tenant_id });

    const user = await UserModel.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    return { tenant, user };
  }
  private async generateTenantId() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const tenantId = generateAlphaNumericToken(12);
      const existingTenant = await Tenant.findByPk(tenantId);

      if (!existingTenant) {
        return tenantId;
      }
    }

    throw new HttpError(409, "Unable to generate unique tenant ID");
  }

  private async resolveTenantId(email: string) {
    const tenant = await Tenant.findOne({ where: { email } });

    if (!tenant) {
      throw new HttpError(404, "Tenant not found for email");
    }

    logger.info("Tenant found", { tenantId: tenant.tenant_id });

    setAsyncStorage({ tenantId: tenant.tenant_id });

    return tenant;
  }

  private createSessionTokens(user: UserModel, tenant: Tenant) {
    const payload = {
      tenantId: tenant.tenant_id,
      userId: user.user_id,
      tenantName: tenant.name,
      userFullName: user.name,
      userEmail: user.email,
    };

    return {
      accessToken: signJwt(payload),
      refreshToken: signRefreshJwt({
        ...payload,
        tokenId: generateRefreshToken(),
      }),
      csrfToken: generateAlphaNumericToken(10),
      user: payload,
    };
  }

  async signup(payload: SignupPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    try {
      const existingTenant = await Tenant.findOne({
        where: { email: payload.email },
        transaction,
      });

      if (existingTenant) {
        throw new HttpError(409, "Email already exists");
      }

      const tenantId = await this.generateTenantId();
      const password = await argon2.hash(payload.password);

      await Tenant.create(
        {
          tenant_id: tenantId,
          name: payload.name,
          email: payload.email,
        },
        { transaction },
      );

      setAsyncStorage({ tenantId });

      const user = await UserModel.create(
        {
          tenant_id: tenantId,
          user_id: crypto.randomUUID(),
          name: "No name",
          email: payload.email,
          password,
        },
        { transaction },
      );

      if (!user) {
        throw new HttpError(500, "Failed to create user");
      }

      eventService.emitEventHelper(EventTypes.TENANT_CREATED, {
        tenantId,
        actor: user.user_id,
        action: EventTypes.TENANT_CREATED,
        targetEntity: "TenantModel",
        transaction,
      });

      await transaction.commit();

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "User created successfully",
      };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {}

      logger.error("Signup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  async login(payload: LoginPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    try {
      const tenant = await this.resolveTenantId(payload.email);

      const user = await UserModel.findOne({
        where: { email: payload.email },
        transaction,
      });

      if (!user) {
        throw new HttpError(401, "Invalid email or password.");
      }

      const passwordIsValid = await argon2.verify(
        user.password,
        payload.password,
      );

      if (!passwordIsValid) {
        throw new HttpError(401, "Invalid email or password.");
      }

      const tokens = this.createSessionTokens(user, tenant);
      await user.update({ refreshToken: tokens.refreshToken }, { transaction });
      await transaction.commit();

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Login successful",
        data: tokens,
      };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {}

      logger.error("Login failed", {
        email: payload.email,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  async refresh(payload: RefreshPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    try {
      let tokenPayload: RefreshTokenPayload;

      try {
        tokenPayload = jwt.verify(
          payload.refreshToken,
          getRefreshTokenSecret(),
        ) as RefreshTokenPayload;
      } catch {
        throw new HttpError(403, "Invalid refresh token");
      }

      const tenant = await Tenant.findByPk(tokenPayload.tenantId, {
        transaction,
      });

      if (!tenant) {
        throw new HttpError(404, "Tenant not found");
      }

      setAsyncStorage({ tenantId: tenant.tenant_id });

      const user = await UserModel.findByPk(tokenPayload.userId, {
        transaction,
      });

      if (!user || user.refreshToken !== payload.refreshToken) {
        throw new HttpError(403, "Invalid refresh token");
      }

      const tokens = this.createSessionTokens(user, tenant);
      await user.update({ refreshToken: tokens.refreshToken }, { transaction });
      await transaction.commit();

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Token refreshed",
        data: tokens,
      };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {}

      logger.error("Token refresh failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  async requestPasswordReset(payload: ResetRequestPayload) {
    const genericMessage =
      "If an account exists for this email, a verification code has been sent.";

    try {
      const resolved = await this.tryResolveUserForPasswordReset(payload.email);
      if (!resolved) {
        return {
          status: ApiResponseStatus.SUCCESS,
          message: genericMessage,
          data: null,
        };
      }

      const { user } = resolved;
      const otp = this.generateResetOtp();
      const resetCodeExpiresAt = new Date(
        Date.now() + PASSWORD_RESET_OTP_EXPIRES_MINUTES * 60 * 1000,
      );

      await user.update({
        resetCode: otp,
        resetCodeExpiresAt,
      });

      const emailContent = buildPasswordResetOtpEmail({
        otp,
        expiresMinutes: PASSWORD_RESET_OTP_EXPIRES_MINUTES,
      });

      await emailDeliveryService.sendEmail({
        to: payload.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      return {
        status: ApiResponseStatus.SUCCESS,
        message: genericMessage,
        data: null,
      };
    } catch (error) {
      logger.error("Password reset request failed", {
        email: payload.email,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  async verifyPasswordResetOtp(payload: ResetVerifyPayload) {
    const resolved = await this.tryResolveUserForPasswordReset(payload.email);
    if (!resolved || !this.isResetCodeValid(resolved.user, payload.code)) {
      throw new HttpError(400, "Invalid or expired verification code.");
    }

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Verification code accepted",
      data: { verified: true },
    };
  }

  async logout(payload: { userId: string }) {
    const user = await UserModel.findByPk(payload.userId);
    if (user) {
      await user.update({ refreshToken: null });
    }
    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Logged out",
    };
  }

  async confirmPasswordReset(payload: ResetConfirmPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    try {
      const resolved = await this.tryResolveUserForPasswordReset(payload.email);
      if (!resolved || !this.isResetCodeValid(resolved.user, payload.code)) {
        throw new HttpError(400, "Invalid or expired verification code.");
      }

      const { tenant, user } = resolved;
      const password = await argon2.hash(payload.password);

      await user.update(
        {
          password,
          refreshToken: null,
          resetCode: null,
          resetCodeExpiresAt: null,
        },
        { transaction },
      );

      eventService.emitEventHelper(EventTypes.PASSWORD_RESETED, {
        tenantId: tenant.tenant_id,
        actor: user.user_id,
        targetEntity: `User: ${user.name}`,
      });

      await transaction.commit();

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Password reset successful",
        data: { message: "Password reset successful" },
      };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {}

      logger.error("Password reset confirm failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }
}

export default new AuthService();
