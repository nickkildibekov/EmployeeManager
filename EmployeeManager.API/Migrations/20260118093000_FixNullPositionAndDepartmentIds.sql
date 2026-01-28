-- Fix NULL PositionId and DepartmentId for existing employees
-- This migration ensures that all existing employees have valid PositionId and DepartmentId

-- Update all employees with NULL DepartmentId to Reserve department
UPDATE Employees
SET DepartmentId = (
    SELECT TOP 1 Id FROM Departments 
    WHERE Name = 'Reserve' OR Name = 'Резерв' OR Name = 'Global Reserve'
)
WHERE DepartmentId IS NULL;

-- Update all employees with NULL PositionId to Unemployed position
UPDATE Employees
SET PositionId = (
    SELECT TOP 1 Id FROM Positions 
    WHERE Title = 'Unemployed' OR Title = 'Без Посади'
)
WHERE PositionId IS NULL;
