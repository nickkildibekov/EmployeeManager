using System;

namespace EmployeeManager.API.Models
{
    /// <summary>
    /// Рух палива по підрозділах та типах палива.
    /// Позитивна кількість означає надходження, негативна — витрати.
    /// </summary>
    public class FuelTransaction
    {
        public Guid Id { get; set; }

        public Guid DepartmentId { get; set; }
        public Department? Department { get; set; }

        public FuelType Type { get; set; }

        /// <summary>
        /// Кількість (наприклад +200 або -35).
        /// </summary>
        public decimal Amount { get; set; }

        /// <summary>
        /// Id відповідного запису з FuelExpenses або FuelIncomes.
        /// </summary>
        public Guid RelatedId { get; set; }

        /// <summary>
        /// Дата внесення (з форми внесення даних).
        /// Для витрат береться з FuelPayment.EntryDate, для надходжень - з FuelIncome.TransactionDate.
        /// </summary>
        public DateTime EntryDate { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}

