namespace EmployeeManager.API.DTO
{
    public class PreviousMonthPaymentDTO
    {
        public Guid Id { get; set; }
        public decimal? PreviousValue { get; set; }
        public decimal? CurrentValue { get; set; }
        public decimal? PreviousValueNight { get; set; }
        public decimal? CurrentValueNight { get; set; }
        public decimal PricePerUnit { get; set; }
        public decimal? PricePerUnitNight { get; set; }
        public DateTime PaymentMonth { get; set; }
        public DateTime CreatedAt { get; set; }
        public string DisplayText { get; set; } = string.Empty; // For dropdown display
    }
}
