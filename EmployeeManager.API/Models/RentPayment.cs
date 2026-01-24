using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManager.API.Models
{
    /// <summary>
    /// Платіж за оренду.
    /// </summary>
    public class RentPayment
    {
        public Guid Id { get; set; }

        [Required]
        public Guid DepartmentId { get; set; }
        public Department Department { get; set; } = null!;

        public Guid? ResponsibleEmployeeId { get; set; }
        public Employee? ResponsibleEmployee { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerUnit { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,3)")]
        public decimal TotalAmount { get; set; }

        public string? BillImageUrl { get; set; }

        [Required]
        public DateTime PaymentMonth { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

