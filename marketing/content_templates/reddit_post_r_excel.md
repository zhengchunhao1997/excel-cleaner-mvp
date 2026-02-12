**Title**: I built a free tool to merge messy Excel/CSV files because Power Query was driving me crazy

**Body**:
Hey r/excel,

I work with a lot of client data exports, and I constantly face the same problem:
1. I have 50+ CSV files to merge.
2. The headers are slightly different (e.g., "Phone" vs "Phone Number").
3. I don't want to upload client data to some random cloud server.

I tried Power Query, but setting up the transformations every time for "messy" headers was tedious. Python (Pandas) is great, but my colleagues can't run scripts.

So I built a **local-first** web tool to handle this:
*   **Drag & Drop** multiple files.
*   **AI Auto-Mapping**: It guesses that "Qty" and "Quantity" are the same column.
*   **100% Local**: The data never leaves your browser (processed via Web Workers).

It's currently an MVP and completely free. I'm looking for feedback from heavy Excel users. Does this actually solve a pain point for you, or am I reinventing the wheel?

I can drop the link in the comments if anyone is interested in testing it out.

Thanks!
