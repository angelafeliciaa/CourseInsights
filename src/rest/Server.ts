import express, { Application, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import * as http from "http";
import cors from "cors";
import { InsightError, NotFoundError, InsightDatasetKind } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

// got from ai

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private insightFacade: InsightFacade;

	constructor(port: number) {
		Log.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.insightFacade = new InsightFacade();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			Log.info("Server::start() - start");
			if (this.server !== undefined) {
				Log.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						Log.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						Log.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public async stop(): Promise<void> {
		Log.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				Log.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					Log.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware(): void {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({ type: "application/*", limit: "10mb" }));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(
			cors({
				origin: "http://localhost:3000",
				methods: ["GET", "POST", "PUT", "DELETE"],
				allowedHeaders: ["Content-Type"],
			})
		);
	}

	// Registers all request handlers to routes
	private registerRoutes(): void {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		// PUT /dataset/:id/:kind
		this.express.put("/dataset/:id/:kind", this.putDataset);

		// DELETE /dataset/:id
		this.express.delete("/dataset/:id", this.deleteDataset);

		// GET /datasets
		this.express.get("/datasets", this.getDatasets);

		// POST /query
		this.express.post("/query", this.postQuery);
	}

	private putDataset = async (req: Request, res: Response): Promise<void> => {
		const id = req.params.id;
		const kindStr = req.params.kind.toLowerCase(); // Normalize the kind string
		let kind: InsightDatasetKind;

		// Validate and map the kind string to the InsightDatasetKind enum
		if (kindStr === InsightDatasetKind.Sections) {
			kind = InsightDatasetKind.Sections;
		} else if (kindStr === InsightDatasetKind.Rooms) {
			kind = InsightDatasetKind.Rooms;
		} else {
			res.status(StatusCodes.BAD_REQUEST).json({ error: `Invalid dataset kind: ${kindStr}` });
			return; // Exit early if kind is invalid
		}

		const content = req.body;

		try {
			const result = await this.insightFacade.addDataset(id, content, kind);
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			if (error instanceof InsightError) {
				res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
			} else {
				res.status(StatusCodes.BAD_REQUEST).json({ error: "Unknown Error" });
			}
		}
	};

	private deleteDataset = async (req: Request, res: Response): Promise<void> => {
		const id = req.params.id;

		try {
			const result = await this.insightFacade.removeDataset(id);
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			if (error instanceof InsightError) {
				res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
			} else if (error instanceof NotFoundError) {
				res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
			} else {
				res.status(StatusCodes.BAD_REQUEST).json({ error: "Unknown Error" });
			}
		}
	};

	private getDatasets = async (_: Request, res: Response): Promise<void> => {
		try {
			const result = await this.insightFacade.listDatasets();
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		}
	};

	private postQuery = async (req: Request, res: Response): Promise<void> => {
		const query = req.body;

		try {
			const result = await this.insightFacade.performQuery(query);
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		}
	};

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response): void {
		try {
			Log.info(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
