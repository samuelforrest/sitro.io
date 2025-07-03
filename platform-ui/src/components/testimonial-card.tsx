import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface TestimonialCardProps {
  rating: number;
  text: string;
  name: string;
  role: string;
  image: string;
  index?: number;
}

export function TestimonialCard({ rating, text, name, role, image, index }: TestimonialCardProps) {
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
          <Image 
            src={image}
            alt={name}
            width={56}
            height={56}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover mr-3 md:mr-4 border-2 border-gray-200"
          />
          <div>
            <p className="font-bold text-gray-900 text-sm md:text-base">{name}</p>
            <p className="text-xs md:text-sm text-gray-500">{role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
