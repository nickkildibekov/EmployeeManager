using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<Position> Positions => Set<Position>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<WorkShift> WorkShifts => Set<WorkShift>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Department has many Employees
            modelBuilder.Entity<Department>()
                .HasMany(d => d.Employees)
                .WithOne(e => e.Department)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Department has many Positions
            modelBuilder.Entity<Department>()
                .HasMany(d => d.Positions)
                .WithOne(p => p.Department)
                .HasForeignKey(p => p.DepartmentId)                
                .OnDelete(DeleteBehavior.Restrict);

            // Employee has one Position
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            // WorkShift has one Employee
            modelBuilder.Entity<WorkShift>()
                .HasOne(ws => ws.Employee)
                .WithMany()
                .HasForeignKey(ws => ws.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}