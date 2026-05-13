import argon2 from "argon2";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Tenant from "../../database/models/system/Tenant";
import UserModel from "../../database/models/tenant/UserModel";
import emailDeliveryService from "../../notification/emailDelivery.service";
import { HttpError } from "../../utils/http";
import {
  generateAlphaNumericToken,
  generateRefreshToken,
  getPasswordResetSecret,
  getRefreshTokenSecret,
  signJwt,
  signPasswordResetJwt,
  signRefreshJwt,
} from "../../utils/token";
import { ApiResponseStatus } from "../../constants/apiResponse";

type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

type LoginPayload = {
  email: string;
  password: string;
  tenantId?: string;
};

type RefreshPayload = {
  refreshToken: string;
};

type ResetRequestPayload = {
  email: string;
  tenantId?: string;
};

type ResetConfirmPayload = {
  resetToken: string;
  password: string;
};

type RefreshTokenPayload = {
  userId: string;
  tenantId: string;
  userEmail: string;
  usersFullName: string;
};

type PasswordResetPayload = {
  userId: string;
  tenantId: string;
};

class AuthService {
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

  private async resolveTenantId(email: string, tenantId?: string) {
    if (tenantId) {
      return tenantId;
    }

    const tenant = await Tenant.findOne({ where: { email } });

    if (!tenant) {
      throw new HttpError(404, "Tenant not found for email");
    }

    return tenant.get("tenant_id") as string;
  }

  private createSessionTokens(user: UserModel, tenantId: string) {
    const payload = {
      userId: user.get("user_id") as string,
      tenantId,
      usersFullName: user.get("name") as string,
      userEmail: user.get("email") as string,
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
    const existingTenant = await Tenant.findOne({
      where: { email: payload.email },
    });

    if (existingTenant) {
      throw new HttpError(409, "Email already exists");
    }

    const tenantId = await this.generateTenantId();
    const password = await argon2.hash(payload.password);

    await Tenant.create({
      tenant_id: tenantId,
      name: payload.name,
      email: payload.email,
    });

    const user = await UserModel.create(
      {
        tenant_id: tenantId,
        user_id: crypto.randomUUID(),
        name: payload.name,
        email: payload.email,
        password,
      },
      { transaction },
    );

    if (!user) {
      throw new HttpError(500, "Failed to create user");
    }
    await transaction.commit();

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "User created successfully",
      data: {
        userId: user.user_id,
        tenantId,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(payload: LoginPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    const tenantId = await this.resolveTenantId(
      payload.email,
      payload.tenantId,
    );

    const user = await UserModel.findOne({
      where: { email: payload.email },
      transaction,
    });

    if (!user) {
      throw new HttpError(403, "Invalid credentials");
    }

    const passwordIsValid = await argon2.verify(
      user.get("password") as string,
      payload.password,
    );

    if (!passwordIsValid) {
      throw new HttpError(403, "Invalid credentials");
    }

    const tokens = this.createSessionTokens(user, tenantId);
    await user.update({ refreshToken: tokens.refreshToken }, { transaction });
    await transaction.commit();

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Login successful",
      data: tokens,
    };
  }

  async refresh(payload: RefreshPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    let tokenPayload: RefreshTokenPayload;

    try {
      tokenPayload = jwt.verify(
        payload.refreshToken,
        getRefreshTokenSecret(),
      ) as RefreshTokenPayload;
    } catch {
      throw new HttpError(403, "Invalid refresh token");
    }

    const user = await UserModel.findByPk(tokenPayload.userId, {
      transaction,
    });

    if (!user || user.get("refreshToken") !== payload.refreshToken) {
      throw new HttpError(403, "Invalid refresh token");
    }

    const tokens = this.createSessionTokens(user, tokenPayload.tenantId);
    await user.update({ refreshToken: tokens.refreshToken }, { transaction });
    await transaction.commit();

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Token refreshed",
      data: tokens,
    };
  }

  async requestPasswordReset(payload: ResetRequestPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    const tenantId = await this.resolveTenantId(
      payload.email,
      payload.tenantId,
    );

    const user = await UserModel.findOne({
      where: { email: payload.email },
      transaction,
    });

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const resetToken = signPasswordResetJwt({
      userId: user.get("user_id") as string,
      tenantId,
    });

    await emailDeliveryService.sendEmail({
      to: payload.email,
      subject: "Wellspring password reset",
      text: `Use this password reset token: ${resetToken}`,
    });

    await transaction.commit();

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Password reset requested",
      data: { resetToken },
    };
  }

  async confirmPasswordReset(payload: ResetConfirmPayload) {
    const transaction = await Tenant.sequelize!.transaction();
    let tokenPayload: PasswordResetPayload;

    try {
      tokenPayload = jwt.verify(
        payload.resetToken,
        getPasswordResetSecret(),
      ) as PasswordResetPayload;
    } catch {
      throw new HttpError(403, "Invalid password reset token");
    }

    const password = await argon2.hash(payload.password);
    const user = await UserModel.findByPk(tokenPayload.userId, {
      transaction,
    });

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    await user.update({ password, refreshToken: null }, { transaction });
    await transaction.commit();

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Password reset successful",
      data: { message: "Password reset successful" },
    };
  }
}

export default new AuthService();
