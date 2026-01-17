using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class SpecializationDTO
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }
}
