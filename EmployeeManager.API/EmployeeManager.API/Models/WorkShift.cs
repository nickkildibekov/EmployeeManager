using EmployeeManager.API.Enums;

namespace EmployeeManager.API.Models
{
    public class WorkShift
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }
        public DateTime Date { get; set; }
        public Status Status { get; set; }
    }
}
