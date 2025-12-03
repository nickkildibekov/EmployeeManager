using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Department
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public ICollection<Employee> Employees { get; set; } = new List<Employee>();

        public ICollection<Position> Positions { get; set; } = new List<Position>();
    }
}