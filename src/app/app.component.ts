import { Component, OnInit } from "@angular/core";
import googleFonts from "google-fonts-complete/google-fonts.json";


@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
	title = "savage";

	ngOnInit(): void {
		setTimeout(async () => {
			for (const [family, font] of Object.entries(googleFonts)) {
				for (const [style, variant] of Object.entries(font.variants)) {
					for (const [weight, props] of Object.entries(variant)) {
						const fontFace = new FontFace(family, `url(${(<any> props).url.ttf})`, {
							style,
							weight,
						});
						await fontFace.load().then(() => document.fonts.add(fontFace))
							.catch((err) => console.warn(`Skipping font: ${family}`));
					}
				}
			}
		}, 1750);
	}
}
