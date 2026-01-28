using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Specialization
    {
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public ICollection<Employee>? Employees { get; set; }
    }
}
