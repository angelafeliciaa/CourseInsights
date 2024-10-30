export class Room {
	public fullname: string;
	public shortname: string;
	public number: string;
	public name: string;
	public address: string;
	public lat: number;
	public lon: number;
	public seats: number;
	public type: string;
	public furniture: string;
	public href: string;

	constructor() {
		this.fullname = "";
		this.shortname = "";
		this.number = "";
		this.name = "";
		this.address = "";
		this.lat = 0;
		this.lon = 0;
		this.seats = 0;
		this.type = "";
		this.furniture = "";
		this.href = "";
	}
}
