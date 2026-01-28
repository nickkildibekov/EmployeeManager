namespace EmployeeManager.API.Models
{
    public class DepartmentPosition
    {
        public Guid DepartmentId { get; set; }
        public Department Department { get; set; } = null!;

        public Guid PositionId { get; set; }
        public Position Position { get; set; } = null!;
    }
}
