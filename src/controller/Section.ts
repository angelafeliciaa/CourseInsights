export class Section {
	public uuid: string;
	public id: string;
	public title: string;
	public instructor: string;
	public dept: string;
	public year: number;
	public avg: number;
	public pass: number;
	public fail: number;
	public audit: number;

	constructor(json: any) {
		if (json.Section === "overall") {
			this.year = 1900;
		} else {
			this.year = parseInt(json.Year, 10);
		}
		this.uuid = json.id.toString();
		this.id = json.Course;
		this.title = json.Title;
		this.instructor = json.Professor;
		this.dept = json.Subject;
		this.avg = json.Avg;
		this.pass = json.Pass;
		this.fail = json.Fail;
		this.audit = json.Audit;
	}
}
