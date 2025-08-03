"use client";

export default function Footer() {
  const links = [
    { label: "Home", href: "/" },
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "2257", href: "/2257" },
    { label: "Abuse", href: "/abuse" },
    { label: "Billing Support", href: "/billing-support" },
    { label: "Copyright", href: "/copyright" },
    { label: "Contact Us", href: "/contact" },
  ];
  return (
    <footer className="bg-gray-100 p-4 mt-auto">
      <div className="container mx-auto flex flex-wrap justify-center gap-4 text-sm">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
