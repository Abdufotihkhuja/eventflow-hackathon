/**
 * Публичный лейаут для блога
 * @module widgets/public-blog-layout
 */

import { Link, useLocation } from "react-router-dom";
import { BookOpen, Home, Bookmark, User, LogIn } from "lucide-react";
import { useT } from "@eventflow/i18n/react";
import { PUBLIC_SITE_URL } from "@api/config";
import { Button } from "@shared/ui";
import { useAuth } from "@entities/auth";
import { cn } from "@shared/lib/cn";

type PublicBlogLayoutProps = {
  children: React.ReactNode;
};

export function PublicBlogLayout({ children }: PublicBlogLayoutProps) {
  const t = useT();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { href: "/", label: t("navigation.home"), icon: Home },
    { href: "/blog", label: t("blog.title"), icon: BookOpen },
  ];

  if (isAuthenticated) {
    navItems.push({
      href: "/saved-blog",
      label: t("blog.layout.saved"),
      icon: Bookmark,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>EventFlow</span>
            <span className="text-muted-foreground text-sm font-normal">
              / {t("blog.title")}
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {t("workspace.layout.routes.dashboard.title")}
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm">
                  <LogIn className="h-4 w-4 mr-2" />
                  {t("navigation.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t">
          <nav className="container mx-auto flex items-center gap-1 px-4 py-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 md:grid-cols-4">
            {/* About */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>{t("blog.layout.brand")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("blog.layout.description")}
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h3 className="font-semibold">{t("blog.layout.navigation")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("navigation.home")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("blog.layout.allPosts")}
                  </Link>
                </li>
                {isAuthenticated && (
                  <li>
                    <Link
                      to="/saved-blog"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("blog.layout.saved")}
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Platform */}
            <div className="space-y-3">
              <h3 className="font-semibold">{t("blog.layout.platform")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/dashboard"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("workspace.layout.routes.dashboard.title")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/my-events"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("workspace.layout.routes.myEvents.title")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/my-blog"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("workspace.layout.routes.myBlog.title")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <h3 className="font-semibold">{t("blog.layout.information")}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href={`${PUBLIC_SITE_URL}/about`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("blog.layout.aboutPlatform")}
                  </a>
                </li>
                <li>
                  <a
                    href={`${PUBLIC_SITE_URL}/privacy`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("blog.layout.privacyPolicy")}
                  </a>
                </li>
                <li>
                  <a
                    href={`${PUBLIC_SITE_URL}/terms`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("blog.layout.termsOfUse")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>
              {t("blog.layout.copyright", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
