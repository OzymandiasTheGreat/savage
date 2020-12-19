import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { PipeTransform, Pipe } from "@angular/core";


@Pipe({ name: "safeHtml"})
export class SafeHtmlPipe implements PipeTransform  {
	constructor(private sanitized: DomSanitizer) { }

	transform(value: string): SafeHtml {
		return this.sanitized.bypassSecurityTrustHtml(value);
	}
}
