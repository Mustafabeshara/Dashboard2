        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Documents</span>
              {selectedFolderId && (
                <Button size="sm" onClick={() => setUploadDocOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedFolderId ? (