using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class ScheduleEntryDTO
    {
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        [Required]
        [RegularExpression("^(Training|OnWork|Rest|Vacation|Illness)$")]
        public string State { get; set; } = "Rest";

        [Required]
        public Guid DepartmentId { get; set; }

        // Hours - automatically calculated on save, but can be read
        public decimal Hours { get; set; }

        // Optional navigation props for read
        public string? EmployeeName { get; set; }
        public string? PositionTitle { get; set; }
        public string? DepartmentName { get; set; }

        // Computed property for duration in hours (for backward compatibility)
        public decimal DurationHours => Hours > 0 ? Hours : (decimal)(EndTime - StartTime).TotalHours;
    }
}
