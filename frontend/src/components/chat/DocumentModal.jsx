import React from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    List, 
    ListItem, 
    ListItemText, 
    Typography,
    Link,
    Box,
    Divider
} from '@mui/material';

const DocumentModal = ({ documents, open, onClose }) => {
    if (!documents || documents.length === 0) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>📚 Documentos recomendados</DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>
                    Basado en tu consulta, te recomendamos los siguientes documentos:
                </Typography>
                
                <List>
                    {documents.map((doc, index) => (
                        <Box key={index}>
                            <ListItem alignItems="flex-start">
                                <ListItemText
                                    primary={
                                        <Link 
                                            href={doc.url} 
                                            target="_blank" 
                                            rel="noopener"
                                            sx={{ fontWeight: 'bold' }}
                                        >
                                            {doc.filename}
                                        </Link>
                                    }
                                    secondary={
                                        <>
                                            <Typography
                                                component="span"
                                                variant="body2"
                                                color="text.primary"
                                                display="block"
                                                gutterBottom
                                            >
                                                🔍 Palabra clave: {doc.keyword}
                                            </Typography>
                                            <Typography
                                                component="span"
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {doc.description}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                            {index < documents.length - 1 && <Divider />}
                        </Box>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
                {documents.map((doc, index) => (
                    <Button 
                        key={index} 
                        onClick={() => window.open(doc.url, '_blank')}
                        color="primary"
                        variant="contained"
                        sx={{ ml: 1 }}
                    >
                        Descargar {doc.filename.split('.')[0]}
                    </Button>
                ))}
            </DialogActions>
        </Dialog>
    );
};

export default DocumentModal;