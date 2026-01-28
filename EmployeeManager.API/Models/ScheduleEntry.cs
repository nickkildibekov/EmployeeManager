namespace EmployeeManager.API.Models
{
    public class ScheduleEntry
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal Hours { get; set; } // Automatically calculated on save
        public string State { get; set; } = "Rest"; // Training, OnWork, Rest, Vacation, Illness
        public Guid DepartmentId { get; set; }

        // Navigation properties
        public Employee? Employee { get; set; }
        public Department? Department { get; set; }

        // Computed property for duration in hours (for backward compatibility)
        public decimal DurationHours => Hours > 0 ? Hours : (decimal)(EndTime - StartTime).TotalHours;
    }
}
