using EmployeeManager.API.Enums;

namespace EmployeeManager.API.DTO
{
    public class WorkShiftDTO
    {
        public int EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public Status Status { get; set; }
    }
}
