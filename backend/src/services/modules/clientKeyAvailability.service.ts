import { Op } from "sequelize";
import SessionModel from "../../database/models/tenant/SessionModel";
import ProgramsModel from "../../database/models/tenant/ProgramsModel";
import { HttpError } from "../../utils/http";
import { getTenantId } from "../../utils/asyncstorage";

class ClientKeyAvailabilityService {
  private normalizeClientKeys(clientKeys: string[]): string[] {
    return [
      ...new Set(
        clientKeys
          .map((k) => k.trim())
          .filter((k) => k.length > 0 && k.length <= 255),
      ),
    ];
  }

  /** Returns client_keys that already have a session in this tenant + program. */
  async findTakenClientKeys(
    programId: string,
    clientKeys: string[],
  ): Promise<string[]> {
    const tenantId = getTenantId();
    const uniqueKeys = this.normalizeClientKeys(clientKeys);

    if (uniqueKeys.length === 0) {
      return [];
    }

    const program = await ProgramsModel.findOne({
      where: { program_id: programId },
    });
    if (!program) {
      throw new HttpError(404, "Program not found");
    }

    const rows = await SessionModel.findAll({
      where: {
        tenant_id: tenantId,
        program_id: programId,
        client_key: { [Op.in]: uniqueKeys },
      },
      attributes: ["client_key"],
    });

    return rows.map((r) => r.client_key);
  }

  async assertClientKeyAvailable(
    programId: string,
    clientKey: string,
    options?: { excludeSessionId?: string },
  ): Promise<void> {
    const trimmed = clientKey.trim();
    if (!trimmed) {
      throw new HttpError(400, "client_key is required");
    }
    if (trimmed.length > 255) {
      throw new HttpError(400, "client_key exceeds 255 characters");
    }

    const tenantId = getTenantId();
    const existing = await SessionModel.findOne({
      where: {
        tenant_id: tenantId,
        program_id: programId,
        client_key: trimmed,
      },
    });

    if (
      existing &&
      (!options?.excludeSessionId ||
        existing.session_id !== options.excludeSessionId)
    ) {
      throw new HttpError(
        409,
        "A session with this client_key already exists in this program",
      );
    }
  }
}

export default new ClientKeyAvailabilityService();
