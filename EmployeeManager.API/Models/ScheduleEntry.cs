namespace EmployeeManager.API.Models
{
    public class ScheduleEntry
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; } // 0..24
        public string State { get; set; } = "Rest"; // OnWork, Rest, Vacation, Illness
        public int DepartmentId { get; set; }

        // Navigation properties
        public Employee? Employee { get; set; }
        public Department? Department { get; set; }
    }
}
