using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class ScheduleEntryDTO
    {
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Range(0, 24)]
        public decimal Hours { get; set; }

        [Required]
        [RegularExpression("^(OnWork|Rest|Vacation|Illness)$")]
        public string State { get; set; } = "Rest";

        [Required]
        public Guid DepartmentId { get; set; }

        // Optional navigation props for read
        public string? EmployeeName { get; set; }
        public string? PositionTitle { get; set; }
    }
}
