using EmployeeManager.API.Models;

namespace EmployeeManager.API.DTO
{
    public class UtilityPaymentDTO
    {
        public Guid Id { get; set; }
        public Guid DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public Guid? ResponsibleEmployeeId { get; set; }
        public string? ResponsibleEmployeeName { get; set; }
        public PaymentType PaymentType { get; set; }
        public string PaymentTypeName { get; set; } = string.Empty;
        public decimal? PreviousValue { get; set; }
        public decimal? CurrentValue { get; set; }
        public decimal? PreviousValueNight { get; set; }
        public decimal? CurrentValueNight { get; set; }
        public decimal PricePerUnit { get; set; }
        public decimal? PricePerUnitNight { get; set; }
        public decimal TotalAmount { get; set; }
        public string? BillImageUrl { get; set; }
        public DateTime PaymentMonth { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UtilityPaymentCreateDTO
    {
        public Guid DepartmentId { get; set; }
        public Guid? ResponsibleEmployeeId { get; set; }
        public PaymentType PaymentType { get; set; }
        public decimal? PreviousValue { get; set; }
        public decimal? CurrentValue { get; set; }
        public decimal? PreviousValueNight { get; set; }
        public decimal? CurrentValueNight { get; set; }
        public decimal PricePerUnit { get; set; }
        public decimal? PricePerUnitNight { get; set; }
        public decimal TotalAmount { get; set; }
        public DateTime PaymentMonth { get; set; }
    }

    public class LatestPaymentDTO
    {
        public decimal? PreviousValue { get; set; }
        public decimal? PreviousValueNight { get; set; }
        public decimal? PricePerUnit { get; set; }
    }
}
