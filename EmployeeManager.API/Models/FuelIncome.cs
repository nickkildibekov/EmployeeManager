using System;

namespace EmployeeManager.API.Models
{
    /// <summary>
    /// Запис про надходження палива (поповнення запасу) для підрозділу.
    /// </summary>
    public class FuelIncome
    {
        public Guid Id { get; set; }

        public Guid DepartmentId { get; set; }
        public Department? Department { get; set; }

        public Guid? ReceiverEmployeeId { get; set; }
        public Employee? ReceiverEmployee { get; set; }

        public FuelType FuelType { get; set; }

        /// <summary>
        /// Кількість палива, додана до запасу (в літрах).
        /// </summary>
        public decimal Amount { get; set; }

        /// <summary>
        /// Дата фактичного надходження палива.
        /// </summary>
        public DateTime TransactionDate { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}

