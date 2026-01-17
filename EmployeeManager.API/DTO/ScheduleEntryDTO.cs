using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class ScheduleEntryDTO
    {
        public int Id { get; set; }

        [Required]
        public int EmployeeId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Range(0, 24)]
        public decimal Hours { get; set; }

        [Required]
        [RegularExpression("^(OnWork|Rest|Vacation|Illness)$")]
        public string State { get; set; } = "Rest";

        [Required]
        public int DepartmentId { get; set; }

        // Optional navigation props for read
        public string? EmployeeName { get; set; }
        public string? PositionTitle { get; set; }
    }
}
