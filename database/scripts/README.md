# Database Scripts

This directory centralizes all database-related scripts for the Medical Coverage System.

## Organization

Scripts are organized by microservice:

- `core/` - Scripts for core service (authentication, users)
  - `seed-users.ts` - Seed initial users

- `crm/` - Scripts for CRM service
  - *(No specific scripts yet)*

- `finance/` - Scripts for finance service
  - *(No specific scripts yet)*

- `hospital/` - Scripts for hospital service
  - `seed-medical-procedures.ts` - Seed medical procedures data

- `insurance/` - Scripts for insurance service
  - *(No specific scripts yet)*

- `general/` - General database scripts
  - `db-setup.sh` - Database setup script
  - `run-seed-procedures.sh` - Run all seed procedures
  - `seed-data.ts` - General seed data

## Usage

To run a specific service's scripts, navigate to the service folder and execute the scripts.

For general scripts, use from the `general/` folder.

## Adding New Scripts

When adding new database scripts:

1. Identify which microservice the script belongs to
2. Place it in the appropriate subfolder
3. Update this README with the script description
4. Ensure the script follows the naming convention (e.g., `seed-*.ts` for seed scripts)