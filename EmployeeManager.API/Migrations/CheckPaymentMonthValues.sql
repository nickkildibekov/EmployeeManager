-- Script to check PaymentMonth values in UtilityPayments table
-- Run this to verify the current state of PaymentMonth before and after migration

-- Check all payments with their PaymentMonth values
SELECT 
    Id,
    DepartmentId,
    PaymentType,
    PaymentMonth,
    DAY(PaymentMonth) AS PaymentDay,  -- Should be 1 after migration
    YEAR(PaymentMonth) AS PaymentYear,
    MONTH(PaymentMonth) AS PaymentMonthNum,
    CreatedAt,
    CurrentValue,
    PreviousValue
FROM UtilityPayments
ORDER BY PaymentMonth DESC, CreatedAt DESC;

-- Count payments where PaymentMonth is NOT on the 1st day
SELECT COUNT(*) AS PaymentsNotOnFirstDay
FROM UtilityPayments
WHERE DAY(PaymentMonth) != 1;

-- Show payments that need normalization (before migration)
SELECT 
    Id,
    PaymentMonth,
    DAY(PaymentMonth) AS CurrentDay,
    DATEFROMPARTS(YEAR(PaymentMonth), MONTH(PaymentMonth), 1) AS NormalizedPaymentMonth
FROM UtilityPayments
WHERE DAY(PaymentMonth) != 1;
