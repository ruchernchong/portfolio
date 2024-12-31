import { Alert, AlertDescription } from "@/cms/components/ui/alert.tsx";
import { Button } from "@/cms/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/cms/components/ui/card.tsx";
import { Input } from "@/cms/components/ui/input.tsx";
import { Textarea } from "@/cms/components/ui/textarea.tsx";
import { Edit, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

interface File {
  id: number;
  name: string;
  content: string;
  lastModified: string;
}

interface AlertType {
  show: boolean;
  message: string;
  type: "success" | "error";
}

const Desk = () => {
  const [files, setFiles] = useState<File[]>([
    {
      id: 1,
      name: "getting-started.mdx",
      content: "# Getting Started\n\nWelcome to our documentation...",
      lastModified: new Date().toISOString(),
    },
    {
      id: 2,
      name: "installation.mdx",
      content: "# Installation Guide\n\nFollow these steps...",
      lastModified: new Date().toISOString(),
    },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [alert, setAlert] = useState<AlertType>({
    show: false,
    message: "",
    type: "success",
  });

  const handleCreateNew = () => {
    setSelectedFile(null);
    setEditMode(true);
    setNewFileName("");
    setFileContent("");
  };

  const handleSave = () => {
    if (!newFileName.endsWith(".mdx")) {
      setAlert({
        show: true,
        message: "File name must end with .mdx",
        type: "error",
      });
      return;
    }

    if (selectedFile) {
      setFiles(
        files.map((file) =>
          file.id === selectedFile.id
            ? {
                ...file,
                name: newFileName,
                content: fileContent,
                lastModified: new Date().toISOString(),
              }
            : file,
        ),
      );
    } else {
      setFiles([
        ...files,
        {
          id: files.length + 1,
          name: newFileName,
          content: fileContent,
          lastModified: new Date().toISOString(),
        },
      ]);
    }

    setAlert({
      show: true,
      message: `File ${selectedFile ? "updated" : "created"} successfully!`,
      type: "success",
    });
    setEditMode(false);
    setSelectedFile(null);
  };

  const handleEdit = (file: File) => {
    setSelectedFile(file);
    setNewFileName(file.name);
    setFileContent(file.content);
    setEditMode(true);
  };

  const handleDelete = (fileId: number) => {
    setFiles(files.filter((file) => file.id !== fileId));
    setAlert({
      show: true,
      message: "File deleted successfully!",
      type: "success",
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>MDXDesk</CardTitle>
            <Button
              onClick={handleCreateNew}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              New File
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alert.show && (
            <Alert
              className={`mb-4 ${alert.type === "error" ? "bg-red-50" : "bg-green-50"}`}
            >
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          {editMode ? (
            <div className="space-y-4">
              <Input
                placeholder="File name (e.g., my-post.mdx)"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="mb-4"
              />
              <Textarea
                placeholder="# Your MDX content here..."
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="min-h-96 font-mono"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex items-center gap-2"
                >
                  <Save size={16} />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4 text-left font-medium text-gray-600">
                        File Name
                      </th>
                      <th className="py-3 px-4 text-left font-medium text-gray-600">
                        Last Modified
                      </th>
                      <th className="py-3 px-4 text-right font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr
                        key={file.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{file.name}</td>
                        <td className="py-3 px-4">
                          {new Date(file.lastModified).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(file)}
                              className="flex items-center gap-1"
                            >
                              <Edit size={14} />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(file.id)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Desk;
