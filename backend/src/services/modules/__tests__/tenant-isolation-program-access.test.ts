import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { asyncLocalStorage, setAsyncStorage } from "../../../utils/asyncstorage";
import Tenant from "../../../database/models/system/Tenant";
import ProgramsModel from "../../../database/models/tenant/ProgramsModel";
import uploadService from "../upload.service";
import programService from "../program.service";

jest.mock("../../../database/models/system/Tenant", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
  },
}));

jest.mock("../../../database/models/tenant/ProgramsModel", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    sequelize: {
      transaction: jest.fn(async () => ({
        commit: jest.fn(async () => undefined),
        rollback: jest.fn(async () => undefined),
      })),
    },
  },
}));

jest.mock("../../storage/s3.service", () => ({
  __esModule: true,
  default: {
    buildSessionObjectKey: jest.fn(),
    objectExists: jest.fn(),
    getPresignedPutUrl: jest.fn(),
    getMediaPlaybackUrl: jest.fn(),
  },
}));

jest.mock("../audit.service", () => ({
  __esModule: true,
  default: {
    recordAudit: jest.fn(async () => undefined),
  },
}));

jest.mock("../../../events/event.service", () => ({
  __esModule: true,
  default: {
    emitEventHelper: jest.fn(),
  },
}));

const tenantFindByPk = Tenant.findByPk as any;
const programsFindOne = ProgramsModel.findOne as any;
const programsFindByPk = ProgramsModel.findByPk as any;

async function withTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return asyncLocalStorage.run({}, async () => {
    setAsyncStorage({ tenantId });
    return fn();
  });
}

describe("Tenant isolation — program access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tenantFindByPk.mockResolvedValue({
      name: "Tenant Alpha",
      tenant_id: "tenant-alpha",
    } as unknown as Tenant);
  });

  it("rejects cross-tenant program access — bulk session CSV import returns 404 when the program is not visible to the tenant scope", async () => {
    programsFindOne.mockResolvedValue(null);

    const csv = Buffer.from(
      "title,duration,ordered_position,instructor_name,tags,file_name\n",
    );

    await withTenantContext("tenant-alpha", async () => {
      await expect(
        uploadService.bulkLinkSessionMediaFromCsv(
          "00000000-0000-4000-8000-000000000099",
          csv,
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Program not found",
      });
    });

    expect(programsFindOne).toHaveBeenCalledWith({
      where: { program_id: "00000000-0000-4000-8000-000000000099" },
    });
  });

  it("rejects cross-tenant program access — getProgram returns 404 when the program row is not in the tenant scope", async () => {
    programsFindByPk.mockResolvedValue(null);

    await expect(
      programService.getProgram(
        "tenant-alpha",
        "00000000-0000-4000-8000-000000000099",
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Program not found",
    });

    expect(programsFindByPk).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000099",
      expect.objectContaining({ transaction: expect.anything() }),
    );
  });

  it("rejects cross-tenant program access — updateProgram returns 404 when the program row is not in the tenant scope", async () => {
    programsFindByPk.mockResolvedValue(null);

    await expect(
      programService.updateProgram(
        "tenant-alpha",
        "actor-1",
        "00000000-0000-4000-8000-000000000099",
        { name: "Hijacked", description: "x", length: 1 },
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Program not found",
    });

    expect(programsFindByPk).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000099",
      expect.objectContaining({ transaction: expect.anything() }),
    );
  });
});
