// got from AI

// src/model/Section.ts

export default class Section {
	private readonly id: string; // Unique identifier for the section
	private readonly course: string; // Course code (e.g., "CPSC 310")
	private readonly instructor: string; // Instructor's name
	private readonly semester: string; // Semester (e.g., "2021W")
	private readonly year: number; // Year (e.g., 2021)
	private readonly students: string[]; // List of student IDs enrolled in the section

	constructor(id: string, course: string, instructor: string, semester: string, year: number, students: string[]) {
		this.id = id;
		this.course = course;
		this.instructor = instructor;
		this.semester = semester;
		this.year = year;
		this.students = students;
	}

	// Optionally, you can add getter methods to access the properties
	public getId(): string {
		return this.id;
	}

	public getCourse(): string {
		return this.course;
	}

	public getInstructor(): string {
		return this.instructor;
	}

	public getSemester(): string {
		return this.semester;
	}

	public getYear(): number {
		return this.year;
	}

	public getStudents(): string[] {
		return this.students;
	}
}

// Validation function
export function validateSectionData(data: any): data is Section {
    return (
        typeof data.id === 'string' &&
        typeof data.course === 'string' &&
        typeof data.instructor === 'string' &&
        typeof data.semester === 'string' &&
        typeof data.year === 'number' &&
        Array.isArray(data.students)
    );
} 
