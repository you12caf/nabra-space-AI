import { Link } from "wouter";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="bg-card border border-border p-8 rounded-3xl shadow-lg max-w-md w-full text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة. قد تكون محذوفة أو تم تغيير رابطها.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full gap-2 rounded-xl">
            <Home className="w-5 h-5" />
            العودة للصفحة الرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
