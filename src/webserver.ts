import * as express from "express";

export function startWebserver(port: number) : void {
    const app = express();
    app.get('/', (req, res) => {
        res.send(`<img src='https://i.imgur.com/6ln1Rpn.png'></img>`);
    });

    const webserver = app.listen(port, () => {
        console.log(`server started on port ${port}`);
    });
}