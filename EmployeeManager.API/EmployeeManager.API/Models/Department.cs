using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Department
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // Many-to-Many: Departments <-> Positions (via join table)
        public ICollection<DepartmentPosition>? DepartmentPositions { get; set; }

        // Employees remain one-to-many
        public ICollection<Employee>? Employees { get; set; }
    }
}