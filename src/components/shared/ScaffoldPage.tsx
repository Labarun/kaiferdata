/**
 * ScaffoldPage - Generic placeholder page for future features
 */
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface ScaffoldPageProps {
  title: string;
  description?: string;
}

export function ScaffoldPage({ title, description }: ScaffoldPageProps) {
  return (
    <div className="animate-fade-in">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="py-12 text-center">
          <Construction className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            This section is under development and will be available in a future phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
