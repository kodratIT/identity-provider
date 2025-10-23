import Link from "next/link";
import { Building2, Shield, Users, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">Identity Provider</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Multi-Tenant Identity Provider for{" "}
              <span className="text-blue-600">Educational Institutions</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Secure, scalable identity management with role-based access control.
              Perfect for managing multiple schools with isolated data and granular permissions.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-900 hover:bg-gray-50"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Enterprise-Grade Features
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Everything you need for secure multi-tenant identity management
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-5xl">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="rounded-lg border bg-white p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Multi-Tenant Architecture
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Complete data isolation for each school. Users can belong to multiple institutions with different roles.
                  </p>
                </div>

                <div className="rounded-lg border bg-white p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Role-Based Access Control
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Fine-grained permissions with customizable roles: Super Admin, School Admin, Teacher, Student, Parent.
                  </p>
                </div>

                <div className="rounded-lg border bg-white p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    User Management
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Comprehensive user lifecycle management with audit logs, activity tracking, and bulk operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Enterprise Security Built-In
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Protected by Supabase Auth with Row Level Security policies
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                <div className="rounded-lg border bg-gray-50 px-4 py-2">
                  ✓ Encrypted at rest and in transit
                </div>
                <div className="rounded-lg border bg-gray-50 px-4 py-2">
                  ✓ OAuth 2.0 support
                </div>
                <div className="rounded-lg border bg-gray-50 px-4 py-2">
                  ✓ Multi-factor authentication
                </div>
                <div className="rounded-lg border bg-gray-50 px-4 py-2">
                  ✓ Audit logging
                </div>
                <div className="rounded-lg border bg-gray-50 px-4 py-2">
                  ✓ GDPR compliant
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Identity Provider</span>
            </div>
            <p className="text-sm text-gray-600">
              © 2025 Identity Provider. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
