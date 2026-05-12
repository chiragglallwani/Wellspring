import migrationService from "../../services/migration.service.js";
async function main() {
  await migrationService.runSystemMigrations();
  process.exit(0);
}
main();
