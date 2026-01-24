using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                return;
            }

            // Suppress pending model changes warning - migrations are handled manually
            optionsBuilder.ConfigureWarnings(warnings =>
                warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }

        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<Position> Positions => Set<Position>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<Equipment> Equipments => Set<Equipment>();
        public DbSet<EquipmentCategory> EquipmentCategories => Set<EquipmentCategory>();
        public DbSet<ScheduleEntry> ScheduleEntries => Set<ScheduleEntry>();
        public DbSet<Specialization> Specializations => Set<Specialization>();

        // Комунальні платежі розділені по типах послуг
        public DbSet<ElectricityPayment> ElectricityPayments => Set<ElectricityPayment>();
        public DbSet<GasPayment> GasPayments => Set<GasPayment>();
        public DbSet<WaterPayment> WaterPayments => Set<WaterPayment>();
        public DbSet<RentPayment> RentPayments => Set<RentPayment>();

        public DbSet<FuelPayment> FuelExpenses => Set<FuelPayment>();
        public DbSet<FuelIncome> FuelIncomes => Set<FuelIncome>();
        public DbSet<FuelTransaction> FuelTransactions => Set<FuelTransaction>();

        public DbSet<DepartmentPosition> DepartmentPositions => Set<DepartmentPosition>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure GUID generation for all entities
            modelBuilder.Entity<Department>()
                .Property(d => d.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Employee>()
                .Property(e => e.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Equipment>()
                .Property(e => e.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Position>()
                .Property(p => p.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Specialization>()
                .Property(s => s.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<EquipmentCategory>()
                .Property(c => c.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<ScheduleEntry>()
                .Property(s => s.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<DepartmentPosition>()
                .HasKey(dp => new { dp.DepartmentId, dp.PositionId });

            modelBuilder.Entity<DepartmentPosition>()
                .HasOne(dp => dp.Department)
                .WithMany(d => d.DepartmentPositions) 
                .HasForeignKey(dp => dp.DepartmentId);

            modelBuilder.Entity<DepartmentPosition>()
                .HasOne(dp => dp.Position)
                .WithMany(p => p.DepartmentPositions) 
                .HasForeignKey(dp => dp.PositionId);

            modelBuilder.Entity<Department>()
                .HasMany(d => d.Employees)
                .WithOne(e => e.Department)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Department>()
                .HasMany(d => d.Equipments)
                .WithOne(e => e.Department)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Specialization)
                .WithMany(s => s.Employees)
                .HasForeignKey(e => e.SpecializationId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Equipment>()
                .HasOne(e => e.Category)
                .WithMany(c => c.Equipments)
                .HasForeignKey(e => e.CategoryId)
                .IsRequired() 
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Equipment>()
                .HasOne(e => e.ResponsibleEmployee)
                .WithMany()
                .HasForeignKey(e => e.ResponsibleEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure decimal precision for Equipment.Amount
            modelBuilder.Entity<Equipment>()
                .Property(e => e.Amount)
                .HasPrecision(18, 2);

            // Configure decimal precision for ScheduleEntry.Hours
            modelBuilder.Entity<ScheduleEntry>()
                .Property(s => s.Hours)
                .HasPrecision(18, 2);

            // Configure ElectricityPayment
            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<ElectricityPayment>()
                .HasOne(u => u.Department)
                .WithMany()
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ElectricityPayment>()
                .HasOne(u => u.ResponsibleEmployee)
                .WithMany()
                .HasForeignKey(u => u.ResponsibleEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.PreviousValue)
                .HasPrecision(18, 3);

            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.CurrentValue)
                .HasPrecision(18, 3);

            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.PreviousValueNight)
                .HasPrecision(18, 3);

            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.CurrentValueNight)
                .HasPrecision(18, 3);

            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.PricePerUnit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.PricePerUnitNight)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ElectricityPayment>()
                .Property(u => u.TotalAmount)
                .HasPrecision(18, 3);

            // Configure GasPayment
            modelBuilder.Entity<GasPayment>()
                .Property(u => u.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<GasPayment>()
                .HasOne(u => u.Department)
                .WithMany()
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GasPayment>()
                .HasOne(u => u.ResponsibleEmployee)
                .WithMany()
                .HasForeignKey(u => u.ResponsibleEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<GasPayment>()
                .Property(u => u.PreviousValue)
                .HasPrecision(18, 3);

            modelBuilder.Entity<GasPayment>()
                .Property(u => u.CurrentValue)
                .HasPrecision(18, 3);

            modelBuilder.Entity<GasPayment>()
                .Property(u => u.PricePerUnit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<GasPayment>()
                .Property(u => u.TotalAmount)
                .HasPrecision(18, 3);

            // Configure WaterPayment
            modelBuilder.Entity<WaterPayment>()
                .Property(u => u.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<WaterPayment>()
                .HasOne(u => u.Department)
                .WithMany()
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WaterPayment>()
                .HasOne(u => u.ResponsibleEmployee)
                .WithMany()
                .HasForeignKey(u => u.ResponsibleEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<WaterPayment>()
                .Property(u => u.PreviousValue)
                .HasPrecision(18, 3);

            modelBuilder.Entity<WaterPayment>()
                .Property(u => u.CurrentValue)
                .HasPrecision(18, 3);

            modelBuilder.Entity<WaterPayment>()
                .Property(u => u.PricePerUnit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<WaterPayment>()
                .Property(u => u.TotalAmount)
                .HasPrecision(18, 3);

            // Configure RentPayment
            modelBuilder.Entity<RentPayment>()
                .Property(u => u.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<RentPayment>()
                .HasOne(u => u.Department)
                .WithMany()
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<RentPayment>()
                .HasOne(u => u.ResponsibleEmployee)
                .WithMany()
                .HasForeignKey(u => u.ResponsibleEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<RentPayment>()
                .Property(u => u.PricePerUnit)
                .HasPrecision(18, 2);

            modelBuilder.Entity<RentPayment>()
                .Property(u => u.TotalAmount)
                .HasPrecision(18, 3);

            // Configure FuelPayment (FuelExpenses table)
            modelBuilder.Entity<FuelPayment>()
                .ToTable("FuelExpenses")
                .Property(f => f.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<FuelPayment>()
                .HasOne(f => f.Department)
                .WithMany()
                .HasForeignKey(f => f.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FuelPayment>()
                .HasOne(f => f.ResponsibleEmployee)
                .WithMany()
                .HasForeignKey(f => f.ResponsibleEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<FuelPayment>()
                .HasOne(f => f.Equipment)
                .WithMany()
                .HasForeignKey(f => f.EquipmentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure decimal precision for FuelPayment
            modelBuilder.Entity<FuelPayment>()
                .Property(f => f.PreviousMileage)
                .HasPrecision(18, 2);

            modelBuilder.Entity<FuelPayment>()
                .Property(f => f.CurrentMileage)
                .HasPrecision(18, 2);

            modelBuilder.Entity<FuelPayment>()
                .Property(f => f.TotalAmount)
                .HasPrecision(18, 2);

            // Configure FuelIncome (FuelIncomes table)
            modelBuilder.Entity<FuelIncome>()
                .ToTable("FuelIncomes")
                .Property(fi => fi.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<FuelIncome>()
                .HasOne(fi => fi.Department)
                .WithMany()
                .HasForeignKey(fi => fi.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FuelIncome>()
                .HasOne(fi => fi.ReceiverEmployee)
                .WithMany()
                .HasForeignKey(fi => fi.ReceiverEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<FuelIncome>()
                .Property(fi => fi.Amount)
                .HasPrecision(18, 2);

            // Configure FuelTransaction
            modelBuilder.Entity<FuelTransaction>()
                .ToTable("FuelTransactions")
                .Property(ft => ft.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<FuelTransaction>()
                .Property(ft => ft.Amount)
                .HasPrecision(18, 2);

        }
    }
}