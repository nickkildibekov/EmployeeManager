namespace EmployeeManager.API.Models
{
    public class ScheduleEntry
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; } // 0..24
        public string State { get; set; } = "Rest"; // OnWork, Rest, Vacation, Illness
        public Guid DepartmentId { get; set; }

        // Navigation properties
        public Employee? Employee { get; set; }
        public Department? Department { get; set; }
    }
}
