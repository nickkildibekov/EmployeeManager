-- Migration: NormalizePaymentMonthToFirstDay
-- Description: Normalizes PaymentMonth to first day of month for all existing records
-- This ensures that PaymentMonth is always the 1st of the month, regardless of when it was originally set

UPDATE UtilityPayments
SET PaymentMonth = DATEFROMPARTS(YEAR(PaymentMonth), MONTH(PaymentMonth), 1)
WHERE DAY(PaymentMonth) != 1;
