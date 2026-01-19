using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class ChangeIdsToGuidProper : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Delete all data first since we cannot convert int to Guid
            migrationBuilder.Sql(@"
                DELETE FROM ScheduleEntries;
                DELETE FROM DepartmentPositions;
                DELETE FROM Equipments;
                DELETE FROM Employees;
                DELETE FROM EquipmentCategories;
                DELETE FROM Positions;
                DELETE FROM Specializations;
                DELETE FROM Departments;
            ");

            // Drop all foreign key constraints first
            migrationBuilder.Sql(@"
                DECLARE @sql NVARCHAR(MAX) = '';
                SELECT @sql += 'ALTER TABLE ' + OBJECT_SCHEMA_NAME(parent_object_id) + '.' + OBJECT_NAME(parent_object_id) + ' DROP CONSTRAINT ' + name + ';'
                FROM sys.foreign_keys
                WHERE referenced_object_id IN (
                    SELECT object_id FROM sys.tables WHERE name IN ('Departments', 'Positions', 'Specializations', 'EquipmentCategories', 'Employees', 'Equipments', 'ScheduleEntries')
                );
                EXEC sp_executesql @sql;
            ");

            // Drop indexes first
            migrationBuilder.Sql(@"
                DECLARE @sqlIndex NVARCHAR(MAX) = '';
                SELECT @sqlIndex += 'DROP INDEX ' + QUOTENAME(OBJECT_SCHEMA_NAME(object_id)) + '.' + QUOTENAME(OBJECT_NAME(object_id)) + '.' + QUOTENAME(name) + ';'
                FROM sys.indexes
                WHERE object_id IN (
                    SELECT object_id FROM sys.tables WHERE name IN ('Departments', 'Positions', 'Specializations', 'EquipmentCategories', 'Employees', 'Equipments', 'ScheduleEntries', 'DepartmentPositions')
                )
                AND name LIKE 'IX_%';
                EXEC sp_executesql @sqlIndex;
            ");

            // Drop primary keys
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_DepartmentPositions' AND object_id = OBJECT_ID('DepartmentPositions'))
                    ALTER TABLE DepartmentPositions DROP CONSTRAINT PK_DepartmentPositions;
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_ScheduleEntries' AND object_id = OBJECT_ID('ScheduleEntries'))
                    ALTER TABLE ScheduleEntries DROP CONSTRAINT PK_ScheduleEntries;
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_Employees' AND object_id = OBJECT_ID('Employees'))
                    ALTER TABLE Employees DROP CONSTRAINT PK_Employees;
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_Equipments' AND object_id = OBJECT_ID('Equipments'))
                    ALTER TABLE Equipments DROP CONSTRAINT PK_Equipments;
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_EquipmentCategories' AND object_id = OBJECT_ID('EquipmentCategories'))
                    ALTER TABLE EquipmentCategories DROP CONSTRAINT PK_EquipmentCategories;
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_Positions' AND object_id = OBJECT_ID('Positions'))
                    ALTER TABLE Positions DROP CONSTRAINT PK_Positions;
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_Specializations' AND object_id = OBJECT_ID('Specializations'))
                    ALTER TABLE Specializations DROP CONSTRAINT PK_Specializations;
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'PK_Departments' AND object_id = OBJECT_ID('Departments'))
                    ALTER TABLE Departments DROP CONSTRAINT PK_Departments;
            ");

            // Drop IDENTITY columns and recreate as GUID
            migrationBuilder.Sql(@"
                -- Departments
                ALTER TABLE Departments DROP COLUMN Id;
                ALTER TABLE Departments ADD Id uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE Departments ADD CONSTRAINT PK_Departments PRIMARY KEY (Id);

                -- Positions
                ALTER TABLE Positions DROP COLUMN Id;
                ALTER TABLE Positions ADD Id uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE Positions ADD CONSTRAINT PK_Positions PRIMARY KEY (Id);

                -- Specializations
                ALTER TABLE Specializations DROP COLUMN Id;
                ALTER TABLE Specializations ADD Id uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE Specializations ADD CONSTRAINT PK_Specializations PRIMARY KEY (Id);

                -- EquipmentCategories
                ALTER TABLE EquipmentCategories DROP COLUMN Id;
                ALTER TABLE EquipmentCategories ADD Id uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE EquipmentCategories ADD CONSTRAINT PK_EquipmentCategories PRIMARY KEY (Id);

                -- Employees
                ALTER TABLE Employees DROP COLUMN Id;
                ALTER TABLE Employees ADD Id uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE Employees ADD CONSTRAINT PK_Employees PRIMARY KEY (Id);

                -- Equipments
                ALTER TABLE Equipments DROP COLUMN Id;
                ALTER TABLE Equipments ADD Id uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE Equipments ADD CONSTRAINT PK_Equipments PRIMARY KEY (Id);

                -- ScheduleEntries
                ALTER TABLE ScheduleEntries DROP COLUMN Id;
                ALTER TABLE ScheduleEntries ADD Id uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE ScheduleEntries ADD CONSTRAINT PK_ScheduleEntries PRIMARY KEY (Id);
            ");

            // Drop default constraints first
            migrationBuilder.Sql(@"
                DECLARE @sqlDefault NVARCHAR(MAX) = '';
                SELECT @sqlDefault += 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
                FROM sys.default_constraints
                WHERE parent_object_id IN (
                    SELECT object_id FROM sys.tables WHERE name IN ('Employees', 'Equipments', 'DepartmentPositions', 'ScheduleEntries')
                );
                EXEC sp_executesql @sqlDefault;
            ");

            // Change foreign key columns
            migrationBuilder.Sql(@"
                -- Employees foreign keys
                ALTER TABLE Employees DROP COLUMN DepartmentId;
                ALTER TABLE Employees ADD DepartmentId uniqueidentifier NULL;
                ALTER TABLE Employees DROP COLUMN PositionId;
                ALTER TABLE Employees ADD PositionId uniqueidentifier NULL;
                ALTER TABLE Employees DROP COLUMN SpecializationId;
                ALTER TABLE Employees ADD SpecializationId uniqueidentifier NOT NULL DEFAULT NEWID();

                -- Equipments foreign keys
                ALTER TABLE Equipments DROP COLUMN DepartmentId;
                ALTER TABLE Equipments ADD DepartmentId uniqueidentifier NULL;
                ALTER TABLE Equipments DROP COLUMN CategoryId;
                ALTER TABLE Equipments ADD CategoryId uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE Equipments DROP COLUMN ResponsibleEmployeeId;
                ALTER TABLE Equipments ADD ResponsibleEmployeeId uniqueidentifier NULL;

                -- DepartmentPositions
                ALTER TABLE DepartmentPositions DROP COLUMN DepartmentId;
                ALTER TABLE DepartmentPositions ADD DepartmentId uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE DepartmentPositions DROP COLUMN PositionId;
                ALTER TABLE DepartmentPositions ADD PositionId uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE DepartmentPositions ADD CONSTRAINT PK_DepartmentPositions PRIMARY KEY (DepartmentId, PositionId);

                -- ScheduleEntries foreign keys
                ALTER TABLE ScheduleEntries DROP COLUMN EmployeeId;
                ALTER TABLE ScheduleEntries ADD EmployeeId uniqueidentifier NOT NULL DEFAULT NEWID();
                ALTER TABLE ScheduleEntries DROP COLUMN DepartmentId;
                ALTER TABLE ScheduleEntries ADD DepartmentId uniqueidentifier NOT NULL DEFAULT NEWID();
            ");

            // Recreate foreign key constraints
            migrationBuilder.Sql(@"
                ALTER TABLE Employees ADD CONSTRAINT FK_Employees_Departments_DepartmentId 
                    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id) ON DELETE SET NULL;
                ALTER TABLE Employees ADD CONSTRAINT FK_Employees_Positions_PositionId 
                    FOREIGN KEY (PositionId) REFERENCES Positions(Id) ON DELETE NO ACTION;
                ALTER TABLE Employees ADD CONSTRAINT FK_Employees_Specializations_SpecializationId 
                    FOREIGN KEY (SpecializationId) REFERENCES Specializations(Id) ON DELETE NO ACTION;
                ALTER TABLE Equipments ADD CONSTRAINT FK_Equipments_Departments_DepartmentId 
                    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id) ON DELETE SET NULL;
                ALTER TABLE Equipments ADD CONSTRAINT FK_Equipments_EquipmentCategories_CategoryId 
                    FOREIGN KEY (CategoryId) REFERENCES EquipmentCategories(Id) ON DELETE NO ACTION;
                ALTER TABLE Equipments ADD CONSTRAINT FK_Equipments_Employees_ResponsibleEmployeeId 
                    FOREIGN KEY (ResponsibleEmployeeId) REFERENCES Employees(Id) ON DELETE SET NULL;
                ALTER TABLE DepartmentPositions ADD CONSTRAINT FK_DepartmentPositions_Departments_DepartmentId 
                    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id);
                ALTER TABLE DepartmentPositions ADD CONSTRAINT FK_DepartmentPositions_Positions_PositionId 
                    FOREIGN KEY (PositionId) REFERENCES Positions(Id);
                ALTER TABLE ScheduleEntries ADD CONSTRAINT FK_ScheduleEntries_Employees_EmployeeId 
                    FOREIGN KEY (EmployeeId) REFERENCES Employees(Id);
                ALTER TABLE ScheduleEntries ADD CONSTRAINT FK_ScheduleEntries_Departments_DepartmentId 
                    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id);
            ");

            // Create indexes
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_DepartmentId' AND object_id = OBJECT_ID('Employees'))
                    CREATE INDEX IX_Employees_DepartmentId ON Employees(DepartmentId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_PositionId' AND object_id = OBJECT_ID('Employees'))
                    CREATE INDEX IX_Employees_PositionId ON Employees(PositionId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_SpecializationId' AND object_id = OBJECT_ID('Employees'))
                    CREATE INDEX IX_Employees_SpecializationId ON Employees(SpecializationId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Equipments_DepartmentId' AND object_id = OBJECT_ID('Equipments'))
                    CREATE INDEX IX_Equipments_DepartmentId ON Equipments(DepartmentId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Equipments_CategoryId' AND object_id = OBJECT_ID('Equipments'))
                    CREATE INDEX IX_Equipments_CategoryId ON Equipments(CategoryId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Equipments_ResponsibleEmployeeId' AND object_id = OBJECT_ID('Equipments'))
                    CREATE INDEX IX_Equipments_ResponsibleEmployeeId ON Equipments(ResponsibleEmployeeId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DepartmentPositions_PositionId' AND object_id = OBJECT_ID('DepartmentPositions'))
                    CREATE INDEX IX_DepartmentPositions_PositionId ON DepartmentPositions(PositionId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ScheduleEntries_EmployeeId' AND object_id = OBJECT_ID('ScheduleEntries'))
                    CREATE INDEX IX_ScheduleEntries_EmployeeId ON ScheduleEntries(EmployeeId);
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ScheduleEntries_DepartmentId' AND object_id = OBJECT_ID('ScheduleEntries'))
                    CREATE INDEX IX_ScheduleEntries_DepartmentId ON ScheduleEntries(DepartmentId);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Specializations",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "EmployeeId",
                table: "ScheduleEntries",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "ScheduleEntries",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ScheduleEntries",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Positions",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "ResponsibleEmployeeId",
                table: "Equipments",
                type: "int",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "Equipments",
                type: "int",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CategoryId",
                table: "Equipments",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Equipments",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "EquipmentCategories",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "SpecializationId",
                table: "Employees",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "PositionId",
                table: "Employees",
                type: "int",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "Employees",
                type: "int",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Employees",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Departments",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "PositionId",
                table: "DepartmentPositions",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "DepartmentPositions",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");
        }
    }
}
