export function event2svg(canvas: SVGSVGElement, event: MouseEvent): { x: number, y: number } {
	const ctm = canvas.getScreenCTM();
	const point = canvas.createSVGPoint();
	point.x = event.clientX;
	point.y = event.clientY;
	const target = point.matrixTransform(ctm.inverse());
	return { x: target.x, y: target.y };
}
