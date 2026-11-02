import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/auth.decorators";
import { TaxonomyService } from "./taxonomy.service";

@Controller("taxonomy")
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get()
  @Public()
  getActiveTaxonomy() {
    return this.taxonomy.getActiveTaxonomy();
  }
}
