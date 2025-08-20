import React, { useState } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Typography,
    Chip,
    Divider,
    Paper,
    Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CommentIcon from '@mui/icons-material/Comment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

type DraggableChecklistItemsProps = {
    items: any[];
    onReorder: (items: any[]) => void;
    onEdit: (item: any) => void;
    onDelete: (item: any) => void;
};

export default function DraggableChecklistItems({
    items,
    onReorder,
    onEdit,
    onDelete,
}: DraggableChecklistItemsProps) {
    // Handle drag end event
    const handleDragEnd = (result: any) => {
        // Dropped outside the list
        if (!result.destination) {
            return;
        }

        const reorderedItems = reorderItems(
            items,
            result.source.index,
            result.destination.index
        );

        onReorder(reorderedItems);
    };

    // Helper function to reorder the items
    const reorderItems = (list: any[], startIndex: number, endIndex: number) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        // Update the order property
        return result.map((item, index) => ({
            ...item,
            order: index,
        }));
    };

    // Render item features (geolocation, comments, uploads)
    const renderItemFeatures = (item: any) => {
        return (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                {item.geoLocationEnabled && (
                    <Tooltip title="Geolocation Enabled">
                        <Chip
                            icon={<LocationOnIcon />}
                            label="Location"
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    </Tooltip>
                )}

                {item.commentsOption !== 'off' && (
                    <Tooltip title={`Comments: ${item.commentsOption}`}>
                        <Chip
                            icon={<CommentIcon />}
                            label={item.commentsOption === 'required' ? 'Required' : 'Optional'}
                            size="small"
                            color={item.commentsOption === 'required' ? 'secondary' : 'default'}
                            variant="outlined"
                        />
                    </Tooltip>
                )}

                {item.uploadOption !== 'off' && (
                    <Tooltip title={`File Upload: ${item.uploadOption}`}>
                        <Chip
                            icon={<AttachFileIcon />}
                            label={item.uploadOption === 'required' ? 'Required' : 'Optional'}
                            size="small"
                            color={item.uploadOption === 'required' ? 'secondary' : 'default'}
                            variant="outlined"
                        />
                    </Tooltip>
                )}
            </Box>
        );
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="checklist-items" isDropDisabled={false}>
                {(provided) => (
                    <List
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        sx={{ width: '100%', bgcolor: 'background.paper' }}
                    >
                        {items.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={false}>
                                {(provided, snapshot) => (
                                    <ListItem
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        sx={{
                                            mb: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                                        }}
                                    >
                                        <Box
                                            {...provided.dragHandleProps}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                mr: 2,
                                                cursor: 'grab',
                                            }}
                                        >
                                            <DragIndicatorIcon color="action" />
                                        </Box>

                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle1">
                                                    {index + 1}. {item.name}
                                                </Typography>
                                            }
                                            secondary={renderItemFeatures(item)}
                                        />

                                        <Box>
                                            <Tooltip title="Edit Item">
                                                <IconButton edge="end" onClick={() => onEdit(item)}>
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Item">
                                                <IconButton edge="end" onClick={() => onDelete(item)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </ListItem>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </List>
                )}
            </Droppable>
        </DragDropContext>
    );
}
