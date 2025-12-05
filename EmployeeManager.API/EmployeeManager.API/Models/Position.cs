using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Position
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        // One-to-Many relationship: Position has many Employees
        public ICollection<Employee>? Employees { get; set; }

        // Many-to-Many: Positions <-> Departments (via join table)
        public ICollection<DepartmentPosition>? DepartmentPositions { get; set; }
    }
}
