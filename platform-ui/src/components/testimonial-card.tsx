
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface TestimonialCardProps {
  rating: number;
  text: string;
  name: string;
  role: string;
  index?: number;
}

export function TestimonialCard({ rating, text, name, role, index }: TestimonialCardProps) {
  return (
    <Card className="flex-shrink-0 w-[280px] md:w-[380px] border-2 bg-white border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center mb-4">
          {[...Array(rating)].map((_, i) => (
            <Star key={`${index}-${i}`} className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-current" />
          ))}
        </div>
        <p className="mb-4 md:mb-6 italic text-gray-700 leading-relaxed text-sm md:text-base">
          &ldquo;{text}&rdquo;
        </p>
        <div className="flex items-center">
          <div>
            <p className="font-bold text-gray-900 text-sm md:text-base">{name}</p>
            <p className="text-xs md:text-sm text-gray-500">{role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
