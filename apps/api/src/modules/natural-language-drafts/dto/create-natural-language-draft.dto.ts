import { IsString, Length } from 'class-validator';

export class CreateNaturalLanguageDraftDto {
  @IsString()
  @Length(3, 2000)
  text: string;
}
