import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PersonalInfo {
  name: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  weight_kg: number | null;
}

interface EditPersonalInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentInfo: PersonalInfo;
  onSave: (info: Partial<PersonalInfo>) => void;
  isLoading?: boolean;
}

export function EditPersonalInfoSheet({ 
  open, 
  onOpenChange, 
  currentInfo, 
  onSave, 
  isLoading 
}: EditPersonalInfoSheetProps) {
  const [name, setName] = useState(currentInfo.name || '');
  const [age, setAge] = useState(currentInfo.age?.toString() || '');
  const [gender, setGender] = useState<string>(currentInfo.gender || '');
  const [height, setHeight] = useState(currentInfo.height_cm?.toString() || '');
  const [weight, setWeight] = useState(currentInfo.weight_kg?.toString() || '');

  const handleSave = () => {
    onSave({
      name: name.trim() || null,
      age: age ? parseInt(age, 10) : null,
      gender: gender as 'male' | 'female' | 'other' | null,
      height_cm: height ? parseFloat(height) : null,
      weight_kg: weight ? parseFloat(weight) : null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Personal Information</SheetTitle>
          <SheetDescription>
            Update your personal details to get accurate calorie calculations.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                min="1"
                max="120"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                min="50"
                max="250"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                min="20"
                max="300"
                step="0.1"
                className="h-12 rounded-xl"
              />
            </div>
          </div>
        </div>

        <Button 
          className="w-full mt-6 h-12 rounded-xl" 
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
