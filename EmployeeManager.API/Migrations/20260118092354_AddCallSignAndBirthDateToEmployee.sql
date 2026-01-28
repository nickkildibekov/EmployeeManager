-- Migration: AddCallSignAndBirthDateToEmployee
-- Date: 2026-01-18

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') AND name = 'CallSign')
BEGIN
    ALTER TABLE [dbo].[Employees]
    ADD [CallSign] nvarchar(100) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') AND name = 'BirthDate')
BEGIN
    ALTER TABLE [dbo].[Employees]
    ADD [BirthDate] datetime2 NULL;
END
GO
